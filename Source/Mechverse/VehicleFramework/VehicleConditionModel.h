#pragma once

#include "CoreMinimal.h"
#include "UObject/NoExportTypes.h"
#include "VehicleConditionModel.generated.h"

USTRUCT(BlueprintType)
struct FVehicleConditionState
{
	GENERATED_BODY()

	// 1. Mechanical condition (clearances, bearing tolerances, compression)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition|Mechanical")
	float MechanicalHealth; // 0-100%

	// 2. Electrical condition (harness continuity, insulation resistance)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition|Electrical")
	float ElectricalHealth; // 0-100%

	// 3. Structural condition (unibody rails, pillars, weld shear strength)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition|Structural")
	float StructuralIntegrity; // 0-100%

	// 4. Body panel condition (dents, creases, panel gap tolerances)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition|BodyPanel")
	float BodyPanelHealth; // 0-100%

	// 5. Paint condition (scratch depth, clearcoat thickness, gloss level)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition|Paint")
	float PaintFinishHealth; // 0-100%

	// 6. Interior condition (seat upholstery, carpet stains, dashboard cracking)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition|Interior")
	float InteriorHealth; // 0-100%

	// 7. Glass condition (windshield chips, cracks, wiper scuffing)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition|Glass")
	float GlassClarity; // 0-100%

	// 8. Tire and wheel condition (tread depth mm, wheel runout, bead pressure)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition|Tires")
	float TireWheelHealth; // 0-100%

	// 9. Fluid condition (viscosity index, moisture %, particle contamination)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition|Fluids")
	float FluidQuality; // 0-100%

	// 10. Cleanliness condition (dust, road salt, grease, mud mass)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition|Cleanliness")
	float CleanlinessScore; // 0-100%

	// 11. Maintenance history count
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition|History")
	int32 TotalServiceEventsRecorded;

	// 12. Safety inspection certification status
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition|Safety")
	bool bPassesRoadworthyInspection;

	FVehicleConditionState()
		: MechanicalHealth(100.0f)
		, ElectricalHealth(100.0f)
		, StructuralIntegrity(100.0f)
		, BodyPanelHealth(100.0f)
		, PaintFinishHealth(100.0f)
		, InteriorHealth(100.0f)
		, GlassClarity(100.0f)
		, TireWheelHealth(100.0f)
		, FluidQuality(100.0f)
		, CleanlinessScore(100.0f)
		, TotalServiceEventsRecorded(0)
		, bPassesRoadworthyInspection(true)
	{}
};

/**
 * Manages the unified multi-axial vehicle condition model.
 * Enforces decoupling: a repaint never repairs a bent frame or leaking gasket.
 */
UCLASS(BlueprintType)
class MECHVERSE_API UVehicleConditionModel : public UObject
{
	GENERATED_BODY()

public:
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Mechverse|Condition")
	FVehicleConditionState CurrentState;

	UFUNCTION(BlueprintCallable, Category = "Mechverse|Condition")
	void EvaluateSafetyInspection();

	UFUNCTION(BlueprintCallable, Category = "Mechverse|Condition")
	void RecordMaintenanceEvent(const FString& OperationDescription);
};
